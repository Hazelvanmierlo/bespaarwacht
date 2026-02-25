import { LockIcon } from "./icons";

export default function PrivacyBanner() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
      <LockIcon />
      <span className="text-xs text-bw-green-dark leading-snug">
        <strong>Wij slaan geen persoonsgegevens op.</strong> Je naam, adres en polisnummer zijn verwijderd.
        Alleen geanonimiseerde verzekeringsdata wordt bewaard voor monitoring.
      </span>
    </div>
  );
}
