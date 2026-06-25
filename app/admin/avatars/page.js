import { readDb } from "@/lib/db";
import AvatarEditor from "./AvatarEditor";

export const dynamic = "force-dynamic";

export const metadata = { title: "Chỉnh vị trí avatar" };

export default async function AvatarAdminPage() {
  const db = await readDb();
  const teams = (db.teams || [])
    .map((t) => ({
      code: t.code,
      name: t.name,
      flag: t.flag || "",
      players: (t.players || [])
        .filter((p) => p.avatar)
        .map((p) => ({ name: p.name, avatar: p.avatar, avatarPos: p.avatarPos || null })),
    }))
    .filter((t) => t.players.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return <AvatarEditor teams={teams} />;
}
