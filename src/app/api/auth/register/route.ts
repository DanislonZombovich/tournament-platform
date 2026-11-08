import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Регистрация по логину и паролю отключена. Пожалуйста, используйте вход через Google, Discord или Steam." },
    { status: 400 }
  );
}
