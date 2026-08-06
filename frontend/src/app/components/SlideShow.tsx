"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface ChartDisplayProps {
  initialFiles: string[];
  ticker: string;
}




export default function Slideshow( {initialFiles, ticker}: ChartDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slides, setSlides] = useState([]);

  const prevSlide = () => {
    setCurrentIndex((prev) => prev === 0 ? slides.length - 1 : prev - 1);
  };
  

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= slides.length-1) ? 0 : prev + 1); 
   
  };
 
  // Auto-advance slides every 5 seconds
  useEffect(() => {
    let sl = [];
    initialFiles.forEach((file) => {
        let f = {id:'', src:'',alt:'',title:''};
        f.src = f.id = f.alt = f.title = file;
        f.title = f.title.replaceAll(".png","");

        sl.push(f);
    });
    setSlides(sl);
    console.log("SLides Length: ",slides.length);
    //const timer = setInterval(nextSlide, 5000);
    //return () => clearInterval(timer);    
  
  }, []);

  useEffect(() => {
     console.log("SLides Length: ",slides.length);
     console.log("Current Index: ", currentIndex);
  },[currentIndex])

  return (
    <>
    <div className="relative w-full max-w-4xl mx-auto h-[450px] overflow-hidden rounded-2xl group shadow-lg">
      {/* Slides Container */}
      <div 
        className="w-full h-full flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide,index) => (
          <div key={index} className="w-full h-full flex-shrink-0 relative">
            <Image
              src={`/${ticker.toLowerCase()}/${slide.src}`}
              alt={slide.alt}
              fill
              priority={slide.id === 1}
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 896px"
            />
            {/* Caption Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-8">
              <h2 className="text-white text-2xl md:text-3xl font-bold tracking-wide drop-shadow-md" style={{marginLeft:"25%"}}>
                {slide.title}
              </h2>
            </div>
          </div>
        ))}
      </div>

      {/* Left Arrow Button */}
      <button
        onClick={prevSlide}
        aria-label="Previous slide"
        className="absolute top-1/2 left-4 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm z-10"
      >
        <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* Right Arrow Button */}
      <button
        onClick={nextSlide}
        aria-label="Next slide"
        className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm z-10"
      >
        <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Indicator Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              currentIndex === index ? "w-6 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
    </>
    
  );
}
