import { supabase } from "../lib/supabaseClient";

export type Product = {
  id: string;
  name: string;
  stats: string | null;
  price: number;
  sale_price: number | null;
  image: string | null;
  is_active: boolean | null;
};

export type MenuSection = {
  title: string;
  data: Product[];
};

export async function fetchMenu(): Promise<MenuSection[]> {
  const { data, error } = await supabase
    .from("categories")
    .select(`
      id,
      title,
      products (
        id,
        name,
        stats,
        price,
        sale_price,
        image,
        is_active
      )
    `)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("❌ Fetch menu error:", error);
    throw error;
  }

  // Format lại đúng kiểu SectionList cần
  const sections: MenuSection[] =
    data?.map((category: any) => ({
      title: category.title,
      data: category.products ?? [],
    })) ?? [];

  return sections;
}
