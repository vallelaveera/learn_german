import {
  BookOpen,
  Download,
  MessageSquareText,
  PhoneCall,
  SquareLibrary,
} from "lucide-react";

interface ActivityIconProps {
  color?: string;
  size?: number;
}

const stroke = 2.25;

/** Home activity card icons — Lucide, matched to each practice mode. */
export function CallActivityIcon({ color = "#FF6B35", size = 26 }: ActivityIconProps) {
  return <PhoneCall size={size} color={color} strokeWidth={stroke} aria-hidden />;
}

export function SentencesActivityIcon({ color = "#805AD5", size = 26 }: ActivityIconProps) {
  return <MessageSquareText size={size} color={color} strokeWidth={stroke} aria-hidden />;
}

export function WordsActivityIcon({ color = "#4A90E2", size = 26 }: ActivityIconProps) {
  return <SquareLibrary size={size} color={color} strokeWidth={stroke} aria-hidden />;
}

export function GrammarActivityIcon({ color = "#38A169", size = 26 }: ActivityIconProps) {
  return <BookOpen size={size} color={color} strokeWidth={stroke} aria-hidden />;
}

export function OfflineActivityIcon({ color = "#0e7490", size = 26 }: ActivityIconProps) {
  return <Download size={size} color={color} strokeWidth={stroke} aria-hidden />;
}
