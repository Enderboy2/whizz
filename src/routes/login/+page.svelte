<script lang="ts">
  export let data;
  import { Auth } from "@supabase/auth-ui-svelte";
  import { ThemeSupa } from "@supabase/auth-ui-shared";
  import { goto } from "$app/navigation";
  let { supabase, session } = data;
  $: ({ supabase, session } = data);
  console.log(supabase);
  console.log(session);

  $: if (session?.user?.email) {
    goto("/" + session.user.email);
  } else {
    console.log("logged out!");
  }
</script>

<div class="hero min-h-screen bg-white max-w-screen">
  <div class="hero-content w-auto">
    <div class="flex flex-col">
      <p class="font-semibold">Create an account or login below!</p>
      <Auth
        supabaseClient={supabase}
        theme="light"
        appearance={{
          theme: ThemeSupa,
        }}
        providers={["google", "github"]}
      />
    </div>
  </div>
</div>
