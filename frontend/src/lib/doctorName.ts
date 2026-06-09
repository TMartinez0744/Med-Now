export function formatDoctorName(raw: string | null | undefined, licenseFallback?: string): string {
    const cleaned = (raw ?? "").replace(/^Dr[a]?\.\s*/i, "").trim();
    if (cleaned) return `Dr. ${cleaned}`;
    if (licenseFallback) return `Dr. Matrícula ${licenseFallback}`;
    return "Dr. Usuario";
}

export function stripDoctorPrefix(raw: string | null | undefined): string {
    return (raw ?? "").replace(/^Dr[a]?\.\s*/i, "").trim();
}
