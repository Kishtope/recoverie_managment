"use client";

import { FilterSelect } from "@/components/filter-select";
import { useGetRecruiterOptions } from "../hooks/use-get-recruiters";

/**
 * @component RecruiterFilter
 * @description Dropdown that narrows a recruiter list to one recruiter (or all). Choices come from the options hook, scoped to the signed-in user.
 * @param value "all" or a recruiter id.
 */
export const RecruiterFilter = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const { data } = useGetRecruiterOptions();
  const options = [{ value: "all", label: "All recruiters" }, ...(data?.recruiters ?? []).map((r) => ({ value: r.id, label: r.name }))];
  return <FilterSelect value={value} onChange={onChange} options={options} ariaLabel="Recruiter" className="w-48" />;
};
