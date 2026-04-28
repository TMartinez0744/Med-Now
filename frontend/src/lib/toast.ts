export function showToast(message: string, type: "error" | "success" = "error") {
    window.dispatchEvent(new CustomEvent("app-toast", { detail: { message, type } }));
}
