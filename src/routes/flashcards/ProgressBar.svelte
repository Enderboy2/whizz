<script lang="ts">
  export let total: number;
  export let current: number;
</script>

<div class="w-full bg-gray-200 h-2">
  <div
    class="bg-primary h-2 rounded-r-sm"
    style="width: {(current / total) * 100}%;"
  ></div>
</div>
