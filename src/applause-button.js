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

const updateClaps = (api, claps, url) => {
  console.log("hrer");
  return fetch(
    `http://fc3c-1-186-127-184.ngrok.io/appreceation/postAppreceation` +
      (url ? `?url=${url}` : ""),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ claps }),
    }
  )
    .then((response) => response.text())
    .then((res) => Number(res));
};
// TODO: polyfill for IE (not edge)

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

const MAX_MULTI_CLAP = 10;

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

       
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="40 50 80 80">
          <g class="flat">
          <path xmlns="http://www.w3.org/2000/svg" d="M98.66,32.68c-4.62-8.6-7.22-13.43-12.79-20.46C80.31,5.19,73.73-1.85,66.37,4.44 c-3.72,3.17-2.6,8.21,0.17,13.22c-0.47-0.31,0.43,2.16-0.01,1.83c-8.35-6.37-10.13-5.67-13.01-3.39 c-6.84,5.41,4.96,16.47,8.81,22.4c0.66,1.02,3.07,1.97,3.64,2.91c0.39,0.64,0.76,1.26,1.11,1.86c-0.43-0.13-0.87-0.26-1.32-0.39 c-4.04-1.13-13.32-2.35-17.54-0.76C22.04,52,23.36,56.31,25.37,61.97c2.01,5.66,9.35,9.84,21.35,2.38 c14.81-6.12,27.11,2.08,27.11,10.6c0,11.7-3.83,18.31-13.88,18.31c-15.89,0-16.74-12.96-25.23-21.45 c-2.29-2.29-7.79-2.96-11.04-0.61c-7.58,5.49-2.68,16.88-0.79,20.69c3.96,7.97,8.84,19.53,21.69,29.95 c6.76,5.48,23.53,4.64,33.23,2.66c18.44-3.76,22.15-16.01,28.07-36.98c2.23-7.89,2.53-14.24,2.53-23.05 C108.41,55.66,102.96,40.69,98.66,32.68z" style="fill:#FAC036;"/>
          <path xmlns="http://www.w3.org/2000/svg" d="M98.3,60.49c-1.18-5.04-10.83-12.92-14.85-15.52c-0.41-2.2-6.34-15.14-10.18-20.25 c-2.13-2.84-6.07-6.68-7.46-8.44c0,0,0.34,1.39-0.65,2.19c0.38,0.46,6.15,7.73,8.55,13.13s4.39,11.24,4.39,11.24 c-2.61-0.87-12.93-4.33-15.78-4.34c0,0,1,0.9,0.98,2.56c-0.02,1.55-2.17,0.73-0.98,1.08c7.62,2.21,18.26,4.85,24.82,11.13 c2.59,2.49,6.42,7.22,8.22,10.33C96.66,65.82,98.62,61.86,98.3,60.49z" style="fill:#E48C15;"/>
          </g>
          <g class="outline">
          <path xmlns="http://www.w3.org/2000/svg" d="M98.66,32.68c-4.62-8.6-7.22-13.43-12.79-20.46C80.31,5.19,73.73-1.85,66.37,4.44 c-3.72,3.17-2.6,8.21,0.17,13.22c-0.47-0.31,0.43,2.16-0.01,1.83c-8.35-6.37-10.13-5.67-13.01-3.39 c-6.84,5.41,4.96,16.47,8.81,22.4c0.66,1.02,3.07,1.97,3.64,2.91c0.39,0.64,0.76,1.26,1.11,1.86c-0.43-0.13-0.87-0.26-1.32-0.39 c-4.04-1.13-13.32-2.35-17.54-0.76C22.04,52,23.36,56.31,25.37,61.97c2.01,5.66,9.35,9.84,21.35,2.38 c14.81-6.12,27.11,2.08,27.11,10.6c0,11.7-3.83,18.31-13.88,18.31c-15.89,0-16.74-12.96-25.23-21.45 c-2.29-2.29-7.79-2.96-11.04-0.61c-7.58,5.49-2.68,16.88-0.79,20.69c3.96,7.97,8.84,19.53,21.69,29.95 c6.76,5.48,23.53,4.64,33.23,2.66c18.44-3.76,22.15-16.01,28.07-36.98c2.23-7.89,2.53-14.24,2.53-23.05 C108.41,55.66,102.96,40.69,98.66,32.68z" style="fill:transparent; stroke:black"/>
          <path xmlns="http://www.w3.org/2000/svg" d="M98.3,60.49c-1.18-5.04-10.83-12.92-14.85-15.52c-0.41-2.2-6.34-15.14-10.18-20.25 c-2.13-2.84-6.07-6.68-7.46-8.44c0,0,0.34,1.39-0.65,2.19c0.38,0.46,6.15,7.73,8.55,13.13s4.39,11.24,4.39,11.24 c-2.61-0.87-12.93-4.33-15.78-4.34c0,0,1,0.9,0.98,2.56c-0.02,1.55-2.17,0.73-0.98,1.08c7.62,2.21,18.26,4.85,24.82,11.13 c2.59,2.49,6.42,7.22,8.22,10.33C96.66,65.82,98.62,61.86,98.3,60.49z" style="fill:lightslategray; ">
       
          
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
    this.currentClap = 0;
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
        console.log("_bufferedClaps", this._bufferedClaps);
        console.log(
          " MAX_MULTI_CLAP - this._totalClaps",
          MAX_MULTI_CLAP - this._totalClaps
        );
        console.log("increment", increment);
        if (increment === 0) {
          localStorage.setItem(
            `blog-max-claps-${window.location.href}`,
            MAX_MULTI_CLAP
          );
        } else {
          localStorage.setItem(
            `blog-max-claps-${window.location.href}`,
            this._bufferedClaps
          );
        }
        console.log("MAX_MULTI_CLAP", MAX_MULTI_CLAP);
        console.log("increment", increment);
        //localStorage.setItem(`blog-max-claps-${window.location.href}`)
        console.log(
          localStorage.getItem(`blog-max-claps-${window.location.href}`)
        );
        console.log(
          localStorage.getItem(`blog-max-claps-${window.location.href}`) ===
            MAX_MULTI_CLAP
        );
        if (
          localStorage.getItem(`blog-max-claps-${window.location.href}`) ===
          MAX_MULTI_CLAP
        ) {
          this.totalCountContainer.classList.remove("count-hidden");
          return;
        }
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
          //this._bufferedClaps = 0;
        });
      }
    }, 800);

    this.addEventListener("mousedown", (event) => {
      if (event.button !== 0) {
        return;
      }
      this.classList.add("clapped");
      toggleClass(this, "clap");
      // if (localStorage.getItem(`blog-claps-${window.location.href}`)) {
      //   //this.totalCountContainer.classList.remove("count-hidden");
      //   return;
      // }
      localStorage.setItem(`blog-liked-${window.location.href}`, "true");

      // if (this.classList.contains("clap-limit-exceeded")) {
      //   //this.countContainer.add("count-hidden");
      //   return;
      // }

      // fire a DOM event with the updated count
      // const clapCount = localStorage.getItem(
      //   `blog-liked-${window.location.href}`
      // )
      //   ? this._cachedClapCount
      //     ? this._cachedClapCount
      //     : 1
      //   : this._cachedClapCount + 1;

      this.currentClap++;
      const clapCount = this.currentClap;
      if (this.currentClap <= MAX_MULTI_CLAP) {
        localStorage.setItem(`blog-claps-${window.location.href}`, clapCount);
        console.log("clapCount", clapCount);
      }
      this.dispatchEvent(
        new CustomEvent("clapped", {
          bubbles: true,
          detail: {
            clapCount,
          },
        })
      );

      // trigger the animation

      // buffer the increased count and defer the update
      this._bufferedClaps = Math.min(MAX_MULTI_CLAP, this._bufferedClaps + 1);
      this._updateClaps();
      this.countContainer.classList.remove("count-hidden");
      //this.totalCountContainer.classList.add("count-hidden");

      // increment the clap count after a small pause (to allow the animation to run)
      setTimeout(() => {
        this.totalCountElement.innerHTML = Math.min(clapCount, MAX_MULTI_CLAP);

        this._countElement.innerHTML = formatClaps(this._bufferedClaps);
        setTimeout(() => {
          this.countContainer.classList.add("count-hidden");
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
      this.currentClap = localStorage.getItem(
        `blog-claps-${window.location.href}`
      )
        ? localStorage.getItem(`blog-claps-${window.location.href}`)
        : this._cachedClapCount;
      initialClapCountResolve(clapCount);
      var isLiked = localStorage.getItem(`blog-liked-${window.location.href}`);

      if (isLiked) {
        this.classList.add("clapped");
        this.classList.add("clap");
        this.totalCountElement.innerHTML = localStorage.getItem(
          `blog-claps-${window.location.href}`
        )
          ? localStorage.getItem(`blog-claps-${window.location.href}`)
          : clapCount;
        return;
      }
      if (clapCount > 0) {
        this.totalCountElement.innerHTML = localStorage.getItem(
          `blog-claps-${window.location.href}`
        )
          ? localStorage.getItem(`blog-claps-${window.location.href}`)
          : clapCount;
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
