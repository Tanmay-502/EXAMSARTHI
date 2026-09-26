export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full h-full p-8 text-center space-y-4">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      <h1 className="text-2xl font-bold" aria-live="assertive">Loading results...</h1>
      <p className="text-muted-foreground">Please wait while we grade your exam.</p>
    </div>
  );
}
