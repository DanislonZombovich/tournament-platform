import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Вход по логину и паролю отключен. Пожалуйста, используйте вход через Google, Discord или Steam." },
    { status: 400 }
  );
}
