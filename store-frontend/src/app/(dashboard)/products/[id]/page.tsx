import ProductDetails from "@/features/products/components/ProductDetails";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ProductDetailsPage({ params }: Props) {
    const resolvedParams = await params;
    return <ProductDetails id={Number(resolvedParams.id)} />;
}
