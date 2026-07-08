import { redirect } from "next/navigation";

export default function SuaraWargaPage() {
  redirect("/login?next=/wa");
}
