import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import './HeroSection.css';

gsap.registerPlugin(ScrollTrigger);

const HeroSection = () => {
  const heroSectionRef = useRef(null);
  const heroContentRef = useRef(null);
  const heroSvgRef = useRef(null);
  const logoPathRef = useRef(null);

  useEffect(() => {
    let heightRatio = window.innerWidth / window.innerHeight;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heroSectionRef.current,
        start: "top top",
        end: "+=200%",
        pin: true,
        scrub: true,
        invalidateOnRefresh: true
      }
    })
    .fromTo(
      [heroSvgRef.current, heroContentRef.current],
      { autoAlpha: 0 },
      { autoAlpha: 1 }
    )
    .fromTo(
      logoPathRef.current,
      {
        scaleX: 0.25,
        scaleY: () => 0.25 * heightRatio,
        x: 0,
        transformOrigin: "center center"
      },
      {
        scaleX: 45,
        scaleY: () => 45 * heightRatio,
        x: 0,
        transformOrigin: "center center",
        duration: 1,
        ease: "power2.in"
      }
    )
    .to({}, { duration: 0.25 });

    const handleResize = () => {
      const { innerWidth, innerHeight } = window;
      heightRatio = innerWidth / innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    };
  }, []);

  return (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" id="clipContainer">
        <clipPath id="clip-path1" clipPathUnits="objectBoundingBox">
          <path 
            ref={logoPathRef}
            id="logoPath" 
            d="M0.5 0C0.2247 0 0 0.2247 0 0.5C0 0.7753 0.2247 1 0.5 1C0.7753 1 1 0.7753 1 0.5C1 0.2247 0.7753 0 0.5 0ZM0.1397 0.5C0.1397 0.3968 0.1842 0.3016 0.2551 0.2368C0.2834 0.2105 0.3320 0.2186 0.3522 0.2530L0.4777 0.4697C0.4899 0.4899 0.4899 0.5142 0.4777 0.5344L0.3522 0.7510C0.3320 0.7874 0.2834 0.7935 0.2530 0.7652C0.1842 0.6964 0.1397 0.6032 0.1397 0.5ZM0.6478 0.7470L0.5223 0.5303C0.5101 0.5101 0.5101 0.4858 0.5223 0.4656L0.6478 0.2488C0.6680 0.2145 0.7124 0.2065 0.7412 0.2327C0.8158 0.2976 0.8603 0.3927 0.8603 0.4960C0.8603 0.5992 0.8158 0.6943 0.7412 0.7591C0.7124 0.7916 0.6680 0.7834 0.6478 0.7470Z" 
          />
        </clipPath>
      </svg>

      <section ref={heroSectionRef} className="hero-section">
        <div className="hero-container">
          <video className="hero-bg-video" autoPlay loop muted playsInline>
            <source src="/assets/hero/hero.mp4" type="video/mp4" />
          </video>
          <div ref={heroSvgRef} className="hero-bg-svg"></div>
          <div ref={heroContentRef} className="hero-content">
            <h1 className="text-dark hero-title-top">META AI</h1>
            <h1 className="text-dark hero-title-bottom">Layer</h1>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;
