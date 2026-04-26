import { Button } from "@/components/ui/button"
import type { ComponentPropsWithoutRef } from "react"

type UButtonProps = ComponentPropsWithoutRef<typeof Button>

export const UButton = (props: UButtonProps) => {
  return <Button {...props} />
}