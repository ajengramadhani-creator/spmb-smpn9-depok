"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type TableFilter = { columnId: string; label: string; options: { label: string; value: string }[] };

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Cari data...",
  filters = [],
  pageSize = 10,
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  filters?: TableFilter[];
  pageSize?: number;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const selectionColumn: ColumnDef<TData, TValue> = {
    id: "select",
    header: ({ table }) => <input type="checkbox" aria-label="Pilih semua baris di halaman" checked={table.getIsAllPageRowsSelected()} ref={(element) => { if (element) element.indeterminate = table.getIsSomePageRowsSelected(); }} onChange={table.getToggleAllPageRowsSelectedHandler()} className="size-4 accent-primary" />,
    cell: ({ row }) => <input type="checkbox" aria-label="Pilih baris" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} className="size-4 accent-primary" />,
    enableSorting: false,
    enableGlobalFilter: false,
  };
  const table = useReactTable({
    data,
    columns: [selectionColumn, ...columns],
    state: { globalFilter, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });
  const selectedCount = table.getSelectedRowModel().rows.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" value={globalFilter} onChange={(event) => setGlobalFilter(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
        </div>
        {filters.map((filter) => (
          <Select key={filter.columnId} aria-label={filter.label} className="sm:max-w-48" value={(table.getColumn(filter.columnId)?.getFilterValue() as string) ?? ""} onChange={(event) => table.getColumn(filter.columnId)?.setFilterValue(event.target.value || undefined)}>
            <option value="">Semua {filter.label}</option>
            {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        ))}
      </div>
      {selectedCount > 0 && <p className="text-sm text-slate-600">{selectedCount} baris dipilih</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            {table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id} className="border-b border-slate-200 px-4 py-3">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
              <tr key={row.id} data-state={row.getIsSelected() ? "selected" : undefined} className="hover:bg-slate-50/80 data-[state=selected]:bg-pale/60">
                {row.getVisibleCells().map((cell) => <td key={cell.id} className="px-4 py-3.5 text-slate-700">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
              </tr>
            )) : <tr><td colSpan={columns.length + 1} className="h-28 text-center text-slate-500">Data belum tersedia.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500">{table.getFilteredRowModel().rows.length} data</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Halaman sebelumnya"><ChevronLeft aria-hidden="true" className="size-4" /></Button>
          <span className="min-w-20 text-center text-xs text-slate-600">Halaman {table.getState().pagination.pageIndex + 1} dari {Math.max(table.getPageCount(), 1)}</span>
          <Button variant="secondary" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Halaman berikutnya"><ChevronRight aria-hidden="true" className="size-4" /></Button>
        </div>
      </div>
    </div>
  );
}