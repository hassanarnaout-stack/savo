interface ProductSceneProps {
  backgroundImage: string;
  productImage: string;
  overlayText: string;
}

export function ProductScene({ backgroundImage, productImage, overlayText }: ProductSceneProps) {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl2">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${backgroundImage})` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <img src={productImage} alt="" className="absolute bottom-4 end-4 h-2/3 w-auto object-contain drop-shadow-2xl" />
      <p className="absolute bottom-6 start-6 max-w-xs text-lg font-black text-white drop-shadow-lg sm:text-2xl">
        {overlayText}
      </p>
    </div>
  );
}
