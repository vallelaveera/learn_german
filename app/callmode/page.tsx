import { redirect } from "next/navigation";

export default function CallModeRedirect() {
  redirect("/call?mode=freisprechen");
}
