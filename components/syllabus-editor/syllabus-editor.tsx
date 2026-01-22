"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical } from "lucide-react";

export interface SyllabusItem {
  id: string;
  content: string;
  subsyllabus?: SubSyllabusItem[];
  isExpanded?: boolean;
}

export interface SubSyllabusItem {
  id: string;
  content: string;
}

interface SyllabusEditorProps {
  syllabus: SyllabusItem[];
  setSyllabus: (syllabus: SyllabusItem[]) => void;
  isLoading?: boolean;
}

export function SyllabusEditor({
  syllabus,
  setSyllabus,
  isLoading = false,
}: SyllabusEditorProps) {
  const toggleExpand = (itemId: string) => {
    setSyllabus(
      syllabus.map((item) =>
        item.id === itemId ? { ...item, isExpanded: !item.isExpanded } : item
      )
    );
  };

  const updateItemContent = (itemId: string, content: string) => {
    setSyllabus(
      syllabus.map((item) =>
        item.id === itemId ? { ...item, content } : item
      )
    );
  };

  const updateSubItemContent = (
    itemId: string,
    subItemId: string,
    content: string
  ) => {
    setSyllabus(
      syllabus.map((item) =>
        item.id === itemId
          ? {
              ...item,
              subsyllabus: item.subsyllabus?.map((sub) =>
                sub.id === subItemId ? { ...sub, content } : sub
              ),
            }
          : item
      )
    );
  };

  const addItem = () => {
    const newId = `item${Date.now()}`;
    setSyllabus([
      ...syllabus,
      {
        id: newId,
        content: "New Topic",
        subsyllabus: [],
        isExpanded: true,
      },
    ]);
  };

  const addSubItem = (itemId: string) => {
    setSyllabus(
      syllabus.map((item) =>
        item.id === itemId
          ? {
              ...item,
              subsyllabus: [
                ...(item.subsyllabus || []),
                { id: `sub${Date.now()}`, content: "New subtopic" },
              ],
            }
          : item
      )
    );
  };

  const deleteItem = (itemId: string) => {
    setSyllabus(syllabus.filter((item) => item.id !== itemId));
  };

  const deleteSubItem = (itemId: string, subItemId: string) => {
    setSyllabus(
      syllabus.map((item) =>
        item.id === itemId
          ? {
              ...item,
              subsyllabus: item.subsyllabus?.filter(
                (sub) => sub.id !== subItemId
              ),
            }
          : item
      )
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {syllabus.map((item, index) => (
        <Card key={item.id} className="border border-gray-200">
          <CardContent className="p-0">
            {/* Main item */}
            <div className="flex items-center gap-2 p-3 bg-gray-50">
              <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-6 w-6"
                onClick={() => toggleExpand(item.id)}
              >
                {item.isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <span className="text-sm font-medium text-gray-500 w-6">
                {index + 1}.
              </span>
              <Input
                value={item.content}
                onChange={(e) => updateItemContent(item.id, e.target.value)}
                className="flex-1 h-8 bg-white"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Sub items */}
            {item.isExpanded && (
              <div className="pl-12 pr-3 pb-3 space-y-2">
                {item.subsyllabus?.map((subItem, subIndex) => (
                  <div key={subItem.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-8">
                      {index + 1}.{subIndex + 1}
                    </span>
                    <Input
                      value={subItem.content}
                      onChange={(e) =>
                        updateSubItemContent(item.id, subItem.id, e.target.value)
                      }
                      className="flex-1 h-7 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                      onClick={() => deleteSubItem(item.id, subItem.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-500 h-7"
                  onClick={() => addSubItem(item.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add subtopic
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={addItem}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Topic
      </Button>
    </div>
  );
}
