interface TransferNoteProps {
  instructions: string;
}

export function TransferNote({ instructions }: TransferNoteProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">
        Include the reference code exactly as shown.
      </p>
      <p className="mt-1 text-amber-800">{instructions}</p>
    </div>
  );
}
