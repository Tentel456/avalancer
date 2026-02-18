import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import './ContentSection.css';

gsap.registerPlugin(ScrollTrigger);

const ContentSection = () => {
  const slideWrappersRef = useRef([]);
  const slidesRef = useRef([]);

  const slides = [
    {
      number: '01',
      title: 'Bring Ideas to',
      titleScript: 'Life',
      description: 'Animation isn\'t just decoration — it\'s how we guide attention, create clarity, and make interfaces feel alive. In this session, you\'ll get hands-on with techniques that transform static layouts into stories.',
      color: 'green'
    },
    {
      number: '02',
      title: 'Learn by Doing',
      description: 'Instead of watching slides fly past, you\'ll code along, experiment, and break things. Each exercise is designed to teach you a practical skill you can immediately put into practice.',
      color: 'white'
    },
    {
      number: '03',
      title: 'Build Your Toolkit',
      description: 'By the end of the workshop, you\'ll hopefully walk away with some helpful snippets, animation principles that stand the test of time, and the confidence to design smoother, smarter interactions.',
      color: 'orange'
    },
    {
      number: '04',
      title: 'Find the Rhythm',
      description: 'Every interaction has a tempo. Some movements are quick and direct, others linger just long enough to create a sense of flow. Learning to notice and shape this rhythm helps everything feel more natural, more connected.',
      color: 'lilac'
    }
  ];

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(min-width: 1200px) and (prefers-reduced-motion: no-preference)", () => {
      slideWrappersRef.current.forEach((wrapper, i) => {
        const card = slidesRef.current[i];
        if (!wrapper || !card) return;

        let scale = 1;
        let rotationZ = 0;
        let rotationX = 0;

        if (i !== slidesRef.current.length - 1) {
          scale = 0.4 + 0.025 * i;
          rotationZ = 5;
          rotationX = 40;
        }

        gsap.to(card, {
          scale,
          rotationX,
          rotationZ,
          transformOrigin: "50% center",
          ease: "none",
          scrollTrigger: {
            trigger: wrapper,
            start: "top top",
            end: "bottom bottom",
            endTrigger: slidesRef.current[slidesRef.current.length - 1],
            scrub: 1,
            pin: wrapper,
            pinSpacing: false,
            id: i + 1
          }
        });
      });
    });

    return () => {
      mm.revert();
    };
  }, []);

  return (
    <section className="Content">
      <div className="Content__inner">
        {slides.map((slide, index) => (
          <div 
            key={index} 
            ref={el => slideWrappersRef.current[index] = el}
            className="Content__wrapper"
          >
            <div 
              ref={el => slidesRef.current[index] = el}
              className={`Content__slide ${slide.color}`}
            >
              <div className="Content__slide-inner">
                <div>
                  <p className="Content__number">{'{ ' + slide.number + ' }'}</p>
                  <h2 className="Content__title heading-lg">
                    {slide.title}
                    {slide.titleScript && (
                      <div className="title-script">{slide.titleScript}</div>
                    )}
                  </h2>
                </div>
                <div>
                  <p className="Content__copy">{slide.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ContentSection;
