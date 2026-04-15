-- Migración para agregar el campo 'comuna' a la tabla 'profiles'
-- Este campo es de tipo texto y permite valores nulos (opcional)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS comuna TEXT;

-- Nota: No es necesario modificar las políticas RLS existentes ya que 
-- las políticas de SELECT, UPDATE y DELETE suelen aplicar a toda la fila
-- o usan select('*'), por lo que el nuevo campo se incluirá automáticamente.
