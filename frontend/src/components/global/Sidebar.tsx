export default function Sidebar() {
  return (
    <aside className="h-full w-64 bg-white border-r border-gray-200 flex flex-col px-4 py-6">
      <nav className="flex flex-col gap-2">
        <a href="/dashboard" className="text-gray-700 hover:text-primary font-medium">
          Dashboard
        </a>
        <a href="/loans" className="text-gray-700 hover:text-primary font-medium">
          Loans
        </a>
      </nav>
    </aside>
  );
}
