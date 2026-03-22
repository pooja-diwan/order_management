import { STATUS_META } from "../utils/helpers";

export default function StatusBadge({ status, pulse = false }) {
    const meta = STATUS_META[status] || STATUS_META.PENDING;
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
        ${meta.color} ${meta.bg} ${meta.border}`}
        >
            <span
                className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${pulse && status === "PROCESSING" ? "animate-pulse2" : ""
                    }`}
            />
            {meta.label}
        </span>
    );
}