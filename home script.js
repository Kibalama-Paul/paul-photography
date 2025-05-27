<script>
  const slideshow = document.querySelector('.slideshow');
  const totalImages = 10; // total number of images
  let currentIndex = 0;

  setInterval(() =&gt; {
    currentIndex = (currentIndex + 1) % totalImages;
    slideshow.style.transform = `translateX(-${currentIndex * 300}px)`;
  &rbrace;, 2000); // change image every 2 seconds
</script>