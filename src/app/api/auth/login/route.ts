import { NextResponse } from "next/server";
import { signToken, INITIAL_USERS } from "@/lib/auth";
import { store } from "@/lib/data-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, role } = body;

    let user = store.users.find(u => u.email === email);

    // If logging in via demo quick-select by role
    if (!user && role) {
      user = store.users.find(u => u.role === role);
    }

    if (!user) {
      // Default fallback to Super Admin for quick preview
      user = store.users[0];
    }

    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: (user as any).branchId || null,
      karigarId: (user as any).karigarId || null,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branchId: (user as any).branchId || null,
        karigarId: (user as any).karigarId || null,
      },
    });

    response.cookies.set({
      name: "goldtrack_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 400 });
  }
}

