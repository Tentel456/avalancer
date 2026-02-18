import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import Flip from 'gsap/Flip';
import CustomEase from 'gsap/CustomEase';
import './TabSystem.css';

gsap.registerPlugin(Flip, CustomEase);
CustomEase.create("osmo-ease", "0.625, 0.05, 0, 1");

const TabSystem = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const bgRef = useRef(null);
  const buttonsRef = useRef([]);
  const contentItemsRef = useRef([]);
  const visualItemsRef = useRef([]);

  const tabs = [
    {
      label: 'Shapes',
      heading: 'Shifting Perspectives',
      description: 'A dynamic exploration of structure, balance, and creative symmetry.',
      image: 'https://cdn.prod.website-files.com/67726722d415dc401ae23cf6/677289e14dd4dbca1d8e5930_philip-oroni-IANBrm46bF0-unsplash%20(2).avif'
    },
    {
      label: 'Depth',
      heading: 'Fragments of Motion',
      description: 'Where design meets depth—an abstract dance of light and form.',
      image: 'https://cdn.prod.website-files.com/67726722d415dc401ae23cf6/677289e19e4d013c6a4c5a1b_philip-oroni-Zx_G3LpNnV4-unsplash%20(1).avif'
    },
    {
      label: 'Layers',
      heading: 'Echoes in Orange',
      description: 'A journey through layered geometry and endless possibilities.',
      image: 'https://cdn.prod.website-files.com/67726722d415dc401ae23cf6/677289e1c88b5b4c14d1e6fd_philip-oroni-h9N7bm-HRCo-unsplash.avif'
    }
  ];

  const handleTabClick = (index) => {
    if (isAnimating || index === activeTab) return;
    setIsAnimating(true);

    const outgoingContent = contentItemsRef.current[activeTab];
    const incomingContent = contentItemsRef.current[index];
    const outgoingVisual = visualItemsRef.current[activeTab];
    const incomingVisual = visualItemsRef.current[index];

    const outgoingLines = outgoingContent?.querySelectorAll("[data-tabs-fade]") || [];
    const incomingLines = incomingContent?.querySelectorAll("[data-tabs-fade]");

    const timeline = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        setIsAnimating(false);
      }
    });

    timeline
      .to(outgoingLines, { y: "-2em", autoAlpha: 0 }, 0)
      .to(outgoingVisual, { autoAlpha: 0, xPercent: 3 }, 0)
      .fromTo(incomingLines, { y: "2em", autoAlpha: 0 }, { y: "0em", autoAlpha: 1, stagger: 0.075 }, 0.4)
      .fromTo(incomingVisual, { autoAlpha: 0, xPercent: 3 }, { autoAlpha: 1, xPercent: 0 }, "<");

    setActiveTab(index);
  };

  const handleButtonHover = (e, isEntering) => {
    if (!bgRef.current) return;
    
    const state = Flip.getState(bgRef.current);
    
    if (isEntering) {
      e.currentTarget.appendChild(bgRef.current);
    } else {
      const activeButton = buttonsRef.current[activeTab];
      if (activeButton) {
        activeButton.appendChild(bgRef.current);
      }
    }
    
    Flip.from(state, { duration: 0.4, ease: "osmo-ease" });
  };

  return (
    <section className="cloneable">
      <div className="tab-layout">
        <div className="tab-layout-col">
          <div className="tab-layout-container">
            <div className="tab-container">
              <div className="tab-container-top">
                <h1 className="tab-layout-heading">Explore the Layers of Abstract Design and Depth</h1>
                <div className="filter-bar">
                  {tabs.map((tab, index) => (
                    <button
                      key={index}
                      ref={el => buttonsRef.current[index] = el}
                      className={`filter-button ${activeTab === index ? 'active' : ''}`}
                      onClick={() => handleTabClick(index)}
                      onMouseEnter={(e) => handleButtonHover(e, true)}
                      onMouseLeave={(e) => handleButtonHover(e, false)}
                      onFocus={(e) => handleButtonHover(e, true)}
                      onBlur={(e) => handleButtonHover(e, false)}
                    >
                      <div className="filter-button__p">{tab.label}</div>
                      {activeTab === index && <div ref={bgRef} className="tab-button__bg"></div>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tab-container-bottom">
                <div className="tab-content-wrap">
                  {tabs.map((tab, index) => (
                    <div
                      key={index}
                      ref={el => contentItemsRef.current[index] = el}
                      className={`tab-content-item ${activeTab === index ? 'active' : ''}`}
                    >
                      <h2 data-tabs-fade="" className="tab-content__heading">{tab.heading}</h2>
                      <p data-tabs-fade="" className="content-p opacity--80">{tab.description}</p>
                    </div>
                  ))}
                </div>
                <a href="#" className="tab-content__button">
                  <p className="content-p">Become a member</p>
                  <div className="content-button__bg"></div>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="tab-layout-col">
          <div className="tab-visual-wrap">
            {tabs.map((tab, index) => (
              <div
                key={index}
                ref={el => visualItemsRef.current[index] = el}
                className={`tab-visual-item ${activeTab === index ? 'active' : ''}`}
              >
                <img src={tab.image} loading="lazy" className="tab-image" alt={tab.heading} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TabSystem;
