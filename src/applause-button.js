import "document-register-element/build/document-register-element";

const VERSION = "3.3.0";
const API = "https://api.applause-button.com";

const getClaps = (api, url) =>
  // TODO: polyfill for IE (not edge)
  fetch(`${api}/get-claps` + (url ? `?url=${url}` : ""), {
    headers: {
      "Content-Type": "text/plain",
    },
  })
    .then((response) => response.text())
    .then((res) => Number(res));

const updateClaps = (api, claps, url) =>
  // TODO: polyfill for IE (not edge)
  fetch(`${api}/update-claps` + (url ? `?url=${url}` : ""), {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
    },
    body: JSON.stringify(`${claps},${VERSION}`),
  })
    .then((response) => response.text())
    .then((res) => Number(res));

const arrayOfSize = (size) => new Array(size).fill(undefined);

const formatClaps = (claps) => `+${claps.toLocaleString("en")}`;

// toggle a CSS class to re-trigger animations
const toggleClass = (element, cls) => {
  element.classList.remove(cls);

  // Force layout reflow
  void element.offsetWidth;

  element.classList.add(cls);
};

const debounce = (fn, delay) => {
  var timer = null;
  return function() {
    var context = this,
      args = arguments;
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(context, args), delay);
  };
};

// https://github.com/WebReflection/document-register-element#v1-caveat
class HTMLCustomElement extends HTMLElement {
  constructor(_) {
    return (_ = super(_)).init(), _;
  }
  init() {}
}

const MAX_MULTI_CLAP = 50;

class ApplauseButton extends HTMLCustomElement {
  connectedCallback() {
    if (this._connected) {
      return;
    }

    this.classList.add("loading");
    this.style.display = "block";
    // when the color of the button is set via its color property, various
    // style properties are set on style-root, which are then inherited by the child elements
    this.innerHTML = `
      <div class="style-root">
        <div class="shockwave"></div>
        <div class="count-container">
          <div class="count"></div>
        </div>

       
        <svg xmlns="http://www.w3.org/2000/svg" width="40px" height="40px"  viewBox="10 0 40 40">
        <g class="flat">
        <path d="m55.1 5.4c-6.3-6.3-16.6-6.3-23 0l-1.8 1.8-1.8-1.8c-6.2-6.5-16.4-6.8-23-.7s-6.8 16.4-.7 23c.2.2.4.5.7.7l23.7 23.7c.3.3.7.4 1.1.4s.8-.1 1-.4l23.7-23.7c6.4-6.3 6.4-16.6.1-23z"></path>
        </g>
        <g class="outline">
        <path d="m55.1 5.4c-6.3-6.3-16.6-6.3-23 0l-1.8 1.8-1.8-1.8c-6.2-6.5-16.4-6.8-23-.7s-6.8 16.4-.7 23c.2.2.4.5.7.7l23.7 23.7c.3.3.7.4 1.1.4s.8-.1 1-.4l23.7-23.7c6.4-6.3 6.4-16.6.1-23zm-2 21.1-.2-.2-22.6 22.6-22.7-22.6c-5.3-5-5.5-13.4-.5-18.8s13.4-5.6 18.8-.6c.1.3.3.4.5.6l2.9 2.8c.6.6 1.5.6 2.1 0l2.8-2.8c5.3-5.1 13.7-5 18.8.3 5 5.2 5 13.4 0 18.5z"></path>
        </g>
      </svg>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 20 20">
          <g class="sparkle">
          ${arrayOfSize(5)
            .map((s) => `<g><circle cx="0" cy="0" r="1"/></g>`)
            .join("")}
          </g>
        </svg>
        <div class="total-count-container">
          <div class="total-count"></div>
        </div>
      </div>
      `;

    this._styleRootElement = this.querySelector(".style-root");
    this._countElement = this.querySelector(".count");
    this.totalCountElement = this.querySelector(".total-count");

    this.countContainer = this.querySelector(".count-container");
    this.totalCountContainer = this.querySelector(".total-count-container");

    this._updateRootColor();
    // the number of claps that this user has made - this is limited
    // by the MAX_MULTI_CLAP property, and whether multiclap is enabled
    this._totalClaps = 0;

    // return the initial clap count as a promise
    let initialClapCountResolve;
    this._initialClapCount = new Promise(
      (resolve) => (initialClapCountResolve = resolve)
    );

    // cache the most recent clap count returned from the server. If, after an update, the clap count
    // is unchanged, either the maximum clap count has been exceeded. Or, the server-side imposed
    // clap limit for this IP address has been exceeded.
    this._cachedClapCount = 0;

    // buffer claps within a 2 second window
    this._bufferedClaps = 0;
    this._updateClaps = debounce(() => {
      if (this._totalClaps < MAX_MULTI_CLAP) {
        const increment = Math.min(
          this._bufferedClaps,
          MAX_MULTI_CLAP - this._totalClaps
        );
        // send the updated clap count - checking the response to see if the server-held
        // clap count has actually incremented

        updateClaps(this.api, increment, this.url).then((updatedClapCount) => {
          if (updatedClapCount === this._cachedClapCount) {
            // if the clap number as not incremented, disable further updates
            this.classList.add("clap-limit-exceeded");
            // and reset the counter
            this._countElement.innerHTML = formatClaps(this._bufferedClaps);
            //this.totalCountElement.innerHTML = updatedClapCount;
          }
          this._cachedClapCount = updatedClapCount;
          this.totalCountContainer.classList.remove("count-hidden");
          this._totalClaps += increment;
          this._bufferedClaps = 0;
        });
      }
    }, 2000);

    this.addEventListener("mousedown", (event) => {
      if (event.button !== 0) {
        return;
      }

      this.classList.add("clapped");
      // if (this.classList.contains("clap-limit-exceeded")) {
      //   //this.countContainer.add("count-hidden");
      //   return;
      // }

      // fire a DOM event with the updated count
      const clapCount = localStorage.getItem(
        `blog-liked-${window.location.href}`
      )
        ? this._cachedClapCount
          ? this._cachedClapCount
          : 1
        : this._cachedClapCount + 1;

      localStorage.setItem(`blog-liked-${window.location.href}`, "true");
      this.dispatchEvent(
        new CustomEvent("clapped", {
          bubbles: true,
          detail: {
            clapCount,
          },
        })
      );

      // trigger the animation
      toggleClass(this, "clap");

      // buffer the increased count and defer the update
      this._bufferedClaps++;
      this._updateClaps();
      this.countContainer.classList.remove("count-hidden");
      this.totalCountContainer.classList.add("count-hidden");

      // increment the clap count after a small pause (to allow the animation to run)
      setTimeout(() => {
        this._countElement.innerHTML = formatClaps(this._bufferedClaps);
        setTimeout(() => {
          this.countContainer.classList.add("count-hidden");
          setTimeout(() => {
            this.totalCountElement.innerHTML = clapCount;
          }, 500);
        }, 1000);
      }, 250);

      // check whether we've exceeded the max claps
      if (this.multiclap) {
        if (this._bufferedClaps + this._totalClaps >= MAX_MULTI_CLAP) {
          this.classList.add("clap-limit-exceeded");
        }
      } else {
        this.classList.add("clap-limit-exceeded");
      }
    });

    getClaps(this.api, this.url).then((clapCount) => {
      this.classList.remove("loading");
      this._cachedClapCount = clapCount;
      initialClapCountResolve(clapCount);
      var isLiked = localStorage.getItem(`blog-liked-${window.location.href}`);

      if (isLiked) {
        this.classList.add("clapped");
        this.classList.add("clap");
        this.totalCountElement.innerHTML = clapCount;
        return;
      }
      if (clapCount > 0) {
        this.totalCountElement.innerHTML = clapCount;
      }
    });

    this._connected = true;
  }

  get initialClapCount() {
    return this._initialClapCount;
  }

  get color() {
    return this.getAttribute("color");
  }

  set api(api) {
    if (api) {
      this.setAttribute("api", api);
    } else {
      this.removeAttribute("api");
    }
  }

  get api() {
    return this.getAttribute("api") || API;
  }

  set color(color) {
    if (color) {
      this.setAttribute("color", color);
    } else {
      this.removeAttribute("color");
    }
    this._updateRootColor();
  }

  set url(url) {
    if (url) {
      this.setAttribute("url", url);
    } else {
      this.removeAttribute("url");
    }
    this._updateRootColor();
  }

  get url() {
    return this.getAttribute("url");
  }

  get multiclap() {
    return this.getAttribute("multiclap") === "true";
  }

  set multiclap(multiclap) {
    if (multiclap) {
      this.setAttribute("multiclap", multiclap ? "true" : "false");
    } else {
      this.removeAttribute("multiclap");
    }
  }

  static get observedAttributes() {
    return ["color"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this._updateRootColor();
  }

  // propagates the color property to the various elements
  // that make up the applause button
  _updateRootColor() {
    if (!this._styleRootElement) {
      return;
    }
    const rootColor = this.getAttribute("color") || "green";
    const style = this._styleRootElement.style;
    style.fill = rootColor;
    style.stroke = rootColor;
    style.color = rootColor;
  }
}

customElements.define("applause-button", ApplauseButton);
