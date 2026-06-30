import { redirect } from "next/navigation";

// Mới vào trang chủ -> mặc định mở tab Fantasy. Bảng xếp hạng vòng bảng nằm ở /standings.
export default function HomePage() {
  redirect("/fantasy");
}
