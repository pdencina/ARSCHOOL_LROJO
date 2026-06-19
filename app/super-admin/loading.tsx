export default function SuperAdminLoading() {
  return (
    <div className="p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-6 w-44 bg-[#e8eaed] rounded-lg mb-2"/>
          <div className="h-4 w-56 bg-[#f3f4f6] rounded"/>
        </div>
        <div className="h-10 w-36 bg-[#e8eaed] rounded-lg"/>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white border border-[#eceef1] rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-[#f3f4f6] rounded-lg"/>
            <div className="space-y-2">
              <div className="h-3 w-16 bg-[#f3f4f6] rounded"/>
              <div className="h-6 w-8 bg-[#e8eaed] rounded"/>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-[#eceef1] rounded-xl overflow-hidden">
        <div className="h-11 bg-[#f9fafb] border-b border-[#eceef1]"/>
        {[1,2,3].map(i => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-[#f3f4f6]">
            <div className="w-8 h-8 bg-[#f3f4f6] rounded-lg"/>
            <div className="h-4 w-36 bg-[#f3f4f6] rounded"/>
            <div className="h-3 w-24 bg-[#f9fafb] rounded"/>
            <div className="h-5 w-16 bg-[#f3f4f6] rounded-md ml-auto"/>
          </div>
        ))}
      </div>
    </div>
  )
}
