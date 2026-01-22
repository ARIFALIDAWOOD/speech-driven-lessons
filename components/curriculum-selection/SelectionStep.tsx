"use client";

import { useState } from "react";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SelectionOption } from "./types";

interface SelectionStepProps {
  label: string;
  placeholder: string;
  description: string;
  options: SelectionOption[];
  value: SelectionOption | null;
  onChange: (option: SelectionOption | null) => void;
  disabled?: boolean;
  isLoading?: boolean;
  required?: boolean;
}

export function SelectionStep({
  label,
  placeholder,
  description,
  options,
  value,
  onChange,
  disabled = false,
  isLoading = false,
  required = true,
}: SelectionStepProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>
      <p className="text-xs text-gray-500">{description}</p>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            className={cn(
              "w-full justify-between h-11 text-left font-normal",
              !value && "text-gray-500",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : value ? (
              <span className="truncate">{value.name}</span>
            ) : (
              placeholder
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => {
                      onChange(option.id === value?.id ? null : option);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === option.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{option.name}</span>
                      {option.description && (
                        <span className="text-xs text-gray-500">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
