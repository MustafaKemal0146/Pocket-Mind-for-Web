import { Typewriter } from "@/components/ui/typewriter-text"

const TypewriterTitle = () => {
  return (
    <Typewriter
      text={["PocketMind for Windows", "PocketMind for Windows"]}
      speed={75}
      loop={false}
      className="text-sm font-semibold"
    />
  )
}

export { TypewriterTitle }


