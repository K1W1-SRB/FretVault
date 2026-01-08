import { motion, useTransform, type MotionValue } from "framer-motion";

export default function GuitarString({
  index,
  scrollYProgress,
  isPlucked,
  onPluck,
  createWavePath,
}: {
  index: number;
  scrollYProgress: MotionValue<number>;
  isPlucked: boolean;
  onPluck: (index: number) => void;
  createWavePath: (amp: number, phase: number) => string;
}) {
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [0, index % 2 === 0 ? 4 : -4]
  );

  const baseAmp = isPlucked ? 12 : 0;
  const phaseOffset = index * 1.5;

  return (
    <motion.svg
      style={{ y }}
      onMouseEnter={() => onPluck(index)}
      className="w-full h-[6px] overflow-visible cursor-pointer"
      viewBox="0 0 800 10"
      preserveAspectRatio="none"
    >
      <motion.path
        fill="none"
        stroke="#00BFA6"
        strokeWidth="3"
        strokeLinecap="round"
        animate={{
          d: isPlucked
            ? [
                createWavePath(baseAmp, phaseOffset),
                createWavePath(baseAmp * 0.8, phaseOffset + 1),
                createWavePath(baseAmp * 0.5, phaseOffset + 2),
                createWavePath(baseAmp * 0.3, phaseOffset + 3),
                createWavePath(0, phaseOffset + 4),
              ]
            : [createWavePath(0, phaseOffset)],
          filter: isPlucked
            ? "drop-shadow(0 0 12px #00BFA6)"
            : "drop-shadow(0 0 6px #00BFA6)",
        }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </motion.svg>
  );
}
