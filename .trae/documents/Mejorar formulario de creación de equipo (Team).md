He analizado el código y confirmo que el proceso actual está incompleto: el sistema asigna automáticamente el rol de "Ventas" y una contraseña genérica (`ChangeMe123!`) sin preguntar.

Para solucionar esto y profesionalizar el alta de usuarios, realizaré los siguientes cambios en `Settings.tsx`:

1.  **Actualizar el Formulario de Invitación:**
    *   Agregaré un **selector de Rol** para que puedas elegir entre: *Ventas (Sales)*, *Gerente (Manager)*, *Admin* o *Soporte*.
    *   Agregaré un **campo de Contraseña** para que definas la clave inicial del usuario.

2.  **Mejorar la Lógica de Creación:**
    *   Modificaré la función `handleAddMember` para que deje de usar la contraseña "quemada" en el código y utilice la que tú ingreses.
    *   Se enviarán correctamente todos los datos (Nombre, Email, Rol, Password) a la API.

Esto te permitirá crear vendedores (u otros roles) con sus credenciales listas para usar desde el primer momento.