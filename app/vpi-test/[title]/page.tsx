"use client";

export default function VpiTestPage({ params }: { params: { title: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">VPI Test Page</h1>
        <p className="text-gray-600 mt-2">Title: {params.title}</p>
        <p className="text-sm text-gray-500 mt-4">
          This is a test page for VPI functionality.
        </p>
      </div>
    </div>
  );
}
