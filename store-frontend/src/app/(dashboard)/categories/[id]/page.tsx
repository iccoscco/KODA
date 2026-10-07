import CategoryDetails from "@/features/categories/components/CategoryDetails";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function CategoryDetailsPage({ params }: Props) {
    const resolvedParams = await params;
    return <CategoryDetails id={Number(resolvedParams.id)} />;
}
