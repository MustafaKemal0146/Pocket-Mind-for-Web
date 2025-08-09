import { Component } from '@/components/ui/etheral-shadow'

const DemoOne = () => {
  return (
    <div className="absolute inset-0">
      <Component
        color="rgba(128, 128, 128, 1)"
        animation={{ scale: 100, speed: 90 }}
        noise={{ opacity: 1, scale: 1.2 }}
        sizing="fill"
      />
    </div>
  )
}

export { DemoOne }


