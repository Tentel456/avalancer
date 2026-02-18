import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import CustomEase from 'gsap/CustomEase';
import './Header.css';

gsap.registerPlugin(CustomEase);
CustomEase.create("main", "0.65, 0.01, 0.05, 0.99");

gsap.defaults({
  ease: "main",
  duration: 0.7
});

const Header = () => {
  const navWrapRef = useRef(null);

  useEffect(() => {
    // Initialize menu as hidden
    gsap.set(".nav", { display: "none" });

    const initMenu = () => {
      let navWrap = document.querySelector(".nav");
      let overlay = navWrap.querySelector(".overlay");
      let menu = navWrap.querySelector(".menu");
      let bgPanels = navWrap.querySelectorAll(".bg-panel");
      let menuToggles = document.querySelectorAll("[data-menu-toggle]");
      let menuLinks = navWrap.querySelectorAll(".menu-link");
      let fadeTargets = navWrap.querySelectorAll("[data-menu-fade]");
      let menuButton = document.querySelector(".menu-button");
      let menuButtonTexts = menuButton.querySelectorAll("p");
      let menuButtonIcon = menuButton.querySelector(".menu-button-icon");

      let tl = gsap.timeline();

      const openNav = () => {
        navWrap.setAttribute("data-nav", "open");

        tl.clear()
          .set(navWrap, { display: "block" })
          .set(menu, { xPercent: 0 }, "<")
          .fromTo(menuButtonTexts, { yPercent: 0 }, { yPercent: -100, stagger: 0.2 })
          .fromTo(menuButtonIcon, { rotate: 0 }, { rotate: 315 }, "<")
          .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1 }, "<")
          .fromTo(bgPanels, { xPercent: 101 }, { xPercent: 0, stagger: 0.12, duration: 0.575 }, "<")
          .fromTo(menuLinks, { yPercent: 140, rotate: 10 }, { yPercent: 0, rotate: 0, stagger: 0.05 }, "<+=0.35")
          .fromTo(fadeTargets, { autoAlpha: 0, yPercent: 50 }, { autoAlpha: 1, yPercent: 0, stagger: 0.04 }, "<+=0.2");
      };

      const closeNav = () => {
        navWrap.setAttribute("data-nav", "closed");

        tl.clear()
          .to(overlay, { autoAlpha: 0 })
          .to(menu, { xPercent: 120 }, "<")
          .to(menuButtonTexts, { yPercent: 0 }, "<")
          .to(menuButtonIcon, { rotate: 0 }, "<")
          .set(navWrap, { display: "none" });
      };

      const toggleHandlers = [];

      // Toggle menu open / close depending on its current state
      menuToggles.forEach((toggle) => {
        const handler = () => {
          const state = navWrap.getAttribute("data-nav");
          if (state === "open") {
            closeNav();
          } else {
            openNav();
          }
        };
        toggle.addEventListener("click", handler);
        toggleHandlers.push({ element: toggle, handler });
      });

      // If menu is open, you can close it using the "escape" key
      const handleEscape = (e) => {
        if (e.key === "Escape" && navWrap.getAttribute("data-nav") === "open") {
          closeNav();
        }
      };
      
      document.addEventListener("keydown", handleEscape);

      // Cleanup function
      return () => {
        toggleHandlers.forEach(({ element, handler }) => {
          element.removeEventListener("click", handler);
        });
        document.removeEventListener("keydown", handleEscape);
        tl.kill();
      };
    };

    const cleanup = initMenu();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <>
      <div className="osmo-ui">
        <header className="header">
          <div className="container is--full">
            <nav className="nav-row">
              <a href="/" aria-label="home" className="nav-logo-row w-inline-block">
                <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 300 300" fill="none" className="nav-logo__icon">
                  <path d="M150 0C67.4089 0 0 67.409 0 150C0 232.591 67.4089 300 150 300C232.591 300 300 232.591 300 150C300 67.409 232.591 0 150 0ZM41.9028 150C41.9028 119.028 55.2631 90.4859 76.5182 71.0527C85.0202 63.158 99.5951 65.587 105.668 75.9109L143.32 140.891C146.964 146.964 146.964 154.251 143.32 160.324L105.668 225.304C99.5951 236.235 85.0202 238.057 75.9109 229.555C55.2632 208.907 41.9028 180.972 41.9028 150ZM194.332 224.089L156.68 159.109C153.036 153.037 153.036 145.749 156.68 139.676L194.332 74.6963C200.405 64.3724 214.372 61.9433 223.482 69.8381C244.737 89.2713 258.097 117.814 258.097 148.785C258.097 179.757 244.737 208.3 223.482 227.733C214.372 237.449 200.405 235.02 194.332 224.089Z" fill="currentColor"/>
                </svg>
              </a>
              <div className="nav-row__right">
                <button role="button" data-menu-toggle="" className="menu-button">
                  <div className="menu-button-text">
                    <p className="p-large">Menu</p>
                    <p className="p-large">Close</p>
                  </div>
                  <div className="icon-wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 16 16" fill="none" className="menu-button-icon">
                      <path d="M7.33333 16L7.33333 -3.2055e-07L8.66667 -3.78832e-07L8.66667 16L7.33333 16Z" fill="currentColor"></path>
                      <path d="M16 8.66667L-2.62269e-07 8.66667L-3.78832e-07 7.33333L16 7.33333L16 8.66667Z" fill="currentColor"></path>
                      <path d="M6 7.33333L7.33333 7.33333L7.33333 6C7.33333 6.73637 6.73638 7.33333 6 7.33333Z" fill="currentColor"></path>
                      <path d="M10 7.33333L8.66667 7.33333L8.66667 6C8.66667 6.73638 9.26362 7.33333 10 7.33333Z" fill="currentColor"></path>
                      <path d="M6 8.66667L7.33333 8.66667L7.33333 10C7.33333 9.26362 6.73638 8.66667 6 8.66667Z" fill="currentColor"></path>
                      <path d="M10 8.66667L8.66667 8.66667L8.66667 10C8.66667 9.26362 9.26362 8.66667 10 8.66667Z" fill="currentColor"></path>
                    </svg>
                  </div>
                </button>
              </div>
            </nav>
          </div>
        </header>
      </div>

      <div ref={navWrapRef} data-nav="closed" className="nav">
        <div data-menu-toggle="" className="overlay"></div>
        <nav className="menu">
          <div className="menu-bg">
            <div className="bg-panel first"></div>
            <div className="bg-panel second"></div>
            <div className="bg-panel"></div>
          </div>
          <div className="menu-inner">
            <ul className="menu-list">
              <li className="menu-list-item">
                <a href="#" className="menu-link w-inline-block">
                  <p className="menu-link-heading">About us</p>
                  <p className="eyebrow">01</p>
                  <div className="menu-link-bg"></div>
                </a>
              </li>
              <li className="menu-list-item">
                <a href="/register" className="menu-link w-inline-block">
                  <p className="menu-link-heading">Register</p>
                  <p className="eyebrow">02</p>
                  <div className="menu-link-bg"></div>
                </a>
              </li>
              <li className="menu-list-item">
                <a href="#" className="menu-link w-inline-block">
                  <p className="menu-link-heading">Login</p>
                  <p className="eyebrow">03</p>
                  <div className="menu-link-bg"></div>
                </a>
              </li>
              <li className="menu-list-item">
                <a href="https://avalancer-docs-demo.vercel.app/" target="_blank" className="menu-link w-inline-block">
                  <p className="menu-link-heading">Docs</p>
                  <p className="eyebrow">04</p>
                  <div className="menu-link-bg"></div>
                </a>
              </li>
              <li className="menu-list-item">
                <a href="#" className="menu-link w-inline-block">
                  <p className="menu-link-heading">GitHub</p>
                  <p className="eyebrow">05</p>
                  <div className="menu-link-bg"></div>
                </a>
              </li>
            </ul>
            <div className="menu-details">
              <p data-menu-fade="" className="p-small">Socials</p>
              <div className="socials-row">
                <a data-menu-fade="" href="https://t.me/@fearted" className="p-large text-link">CEO: ALEKSANDR GRISHIN</a>
                <a data-menu-fade="" href="#" className="p-large text-link">FANTASY BUILDERS</a>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};

export default Header;
