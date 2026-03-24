import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center max-w-[420px]">
        <div className="text-[48px] mb-4">🔍</div>
        <h2 className="font-heading text-[24px] font-bold text-bw-deep mb-2">
          Pagina niet gevonden
        </h2>
        <p className="text-[14px] text-bw-text-mid mb-6">
          Deze pagina bestaat niet of is verplaatst.
        </p>
        <Link
          href="/"
          className="inline-flex px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-bw-green text-white hover:bg-bw-green-strong transition-colors no-underline"
        >
          Naar home
        </Link>
      </div>
    </div>
  );
}
