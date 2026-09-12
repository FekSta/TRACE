import Button from "./Button";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function TableFooter({ page, pageSize, total, onPageChange }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-small text-muted">
      <span aria-live="polite">
        Showing {start} to {end} of {total} {total === 1 ? "item" : "items"}
      </span>
      <nav aria-label="Table pagination" className="flex items-center gap-1">
        <Button
          aria-label="Previous page"
          className="min-h-9 h-9 px-3"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">chevron_left</span>
        </Button>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
          <Button
            key={pageNumber}
            aria-current={pageNumber === currentPage ? "page" : undefined}
            aria-label={`Page ${pageNumber}`}
            className={`min-h-9 h-9 min-w-9 px-2 ${pageNumber === currentPage ? "bg-ink text-white hover:bg-ink" : ""}`}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </Button>
        ))}
        <Button
          aria-label="Next page"
          className="min-h-9 h-9 px-3"
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">chevron_right</span>
        </Button>
      </nav>
    </div>
  );
}