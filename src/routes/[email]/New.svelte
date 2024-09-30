<script lang="ts">
  import { page } from "$app/stores";
  import Search from "./Search.svelte";

  export let profile;
  export let saveProfile;
  export let data;
  let { supabase, session } = data;
  $: ({ supabase, session } = data);
  $: email = $page.params.email;
</script>

<div class="w-full h-full flex flex-col justify-center items-center">
  <h1 class="mb-6 font-bold text-xl">Try adding a syllabus 👇</h1>
  <Search {profile} {saveProfile} {data} />
</div>
