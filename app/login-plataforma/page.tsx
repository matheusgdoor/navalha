import { redirect } from "next/navigation";
export default function PlatformLogin() {
  redirect("/login?next=/plataforma&area=saas");
}
