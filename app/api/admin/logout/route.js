import { NextResponse } from "next/server";

export async function POST() {
  try {
    // In a real implementation, you might want to invalidate server-side sessions
    // For now, we'll just return success - the client will handle localStorage cleanup
    
    return NextResponse.json({
      message: "Logout successful"
    });

  } catch (error) {
    console.error("Admin logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
