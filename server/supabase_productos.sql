create table if not exists public.productos (
    id bigint generated always as identity primary key,
    nombre text not null,
    descripcion text,
    precio numeric(10, 2),
    imagen text,
    categoria text,
    categorias text[],
    etiqueta text,
    favorito boolean not null default false,
    destacado boolean not null default false,
    created_at timestamptz not null default now()
);

alter table public.productos enable row level security;

drop policy if exists "Productos visibles para todos" on public.productos;

create policy "Productos visibles para todos"
on public.productos
for select
using (true);

insert into public.productos (nombre, descripcion, precio, imagen, categorias, etiqueta, favorito)
values
(
    'Pastel de arandanos',
    'Bizcocho suave con arandanos, crema ligera y un sabor frutal que se siente fresco en cada porcion.',
    30,
    'https://mejorconsalud.as.com/wp-content/uploads/2015/04/bizcocho-arandanos1.jpg',
    array['pasteles', 'frutales'],
    null,
    false
),
(
    'Pastel de Frutos del Bosque',
    'Capas suaves con frutos rojos, crema delicada y un equilibrio rico entre dulce y acido.',
    60,
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQE8i1epLs-XqF0_Xcs34yzXfC3RSwLIyLPKg&s',
    array['pasteles', 'frutales', 'favoritos'],
    'Favorito',
    true
),
(
    'Pastel de tres leches',
    'Humedo, cremoso y bien casero, preparado para quienes aman un postre dulce sin complicarse.',
    48,
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRzu_E3RjOmCBWMqx3vDb2hn_u70GnJqsZfOqKWngp9Ww&s',
    array['pasteles', 'clasicos', 'favoritos'],
    'Clasico',
    true
),
(
    'Pastel de Moka',
    'Crema de cafe, bizcocho tierno y un acabado suave para un sabor elegante y nada empalagoso.',
    67,
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSjk0wiVxQNBYktCByUVk8JxYNFtLbafR1jy6iqP_v9Iw&s',
    array['pasteles', 'clasicos'],
    null,
    false
),
(
    'Pastel de selva negra',
    'Chocolate, crema y cerezas en una combinacion clasica, intensa y perfecta para compartir.',
    56,
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQy2YDhQhLNn4Rbe-svw36v3z0yLiFRlVAd4cXPwb7hLQ&s',
    array['pasteles', 'clasicos', 'favoritos'],
    'Especial',
    true
);
