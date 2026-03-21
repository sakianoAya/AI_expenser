import {
  Utensils, Car, Home, ShoppingBag, Gamepad2, Plane,
  ShoppingCart, Users, Building, Shield, Repeat, GraduationCap,
  HelpCircle, Carrot, Heart, Zap, MoreHorizontal
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  home: Home,
  "shopping-bag": ShoppingBag,
  "gamepad-2": Gamepad2,
  plane: Plane,
  "shopping-cart": ShoppingCart,
  users: Users,
  building: Building,
  shield: Shield,
  repeat: Repeat,
  carrot: Carrot,
  heart: Heart,
  zap: Zap,
  "more-horizontal": MoreHorizontal,
}

export function getCategoryIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || HelpCircle
}
