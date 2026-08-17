"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Baby, HeartPulse, Activity, ShieldCheck } from "lucide-react";

const greetings = [
  { text: "Expert Prenatal Care...", color: "text-pink-500", Icon: HeartPulse },
  { text: "Safe Deliveries...", color: "text-rose-400", Icon: Baby },
  { text: "24/7 Monitoring...", color: "text-teal-500", Icon: Activity },
  { text: "Nurturing New Life.", color: "text-sky-500", Icon: ShieldCheck },
];

const AnimatedTextRoller = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(() => {
      if (isMounted) {
        setIndex((prev) => (prev + 1) % greetings.length);
      }
    }, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 flex-wrap font-serif text-center w-full">
      <p className="text-2xl sm:text-4xl font-semibold text-slate-800 text-center">
        Providing
      </p>
      <div className="overflow-hidden h-10 text-center flex justify-center">
        <div
          className="transition-transform duration-700 ease-in-out"
          style={{ transform: `translateY(-${index * 2.5}rem)` }}
        >
          {greetings.map((g, i) => (
            <p
              key={i}
              className={cn(
                "h-10 flex items-center justify-center text-2xl sm:text-4xl font-bold",
                g.color
              )}
            >
              <g.Icon className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 animate-pulse shrink-0" />
              <span>{g.text}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnimatedTextRoller;
