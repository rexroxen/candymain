$(document).ready(function() {
    if ($('.jdgm-all-reviews-widget').length > 0) {
        $('.jdgm-all-reviews-widget').appendTo('.custom-content-width');
    }
});
$(document).ready(function () {
  $('.image-slider').slick({
    dots: true,
    arrows: true,
    infinite: true,
    speed: 300,
    slidesToShow: 4,
    slidesToScroll: 1,
    //autoplay: true,
    //autoplaySpeed: 2000
    responsive: [{
        breakpoint: 1300,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          arrows: true,
          infinite: false
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          arrows: false,
          infinite: false
        }
      }
    ]
  });

  var $slider = $('.image-slider');
  var $scrollbarThumb = $('#scrollbar-thumb');
  var totalSlides = $slider.slick('getSlick').slideCount;
  var slidesToShow = $slider.slick('slickGetOption', 'slidesToShow');

  $scrollbarThumb.css('width', (slidesToShow / totalSlides) * 100 + '%');

  $slider.on('afterChange', function (event, slick, currentSlide) {
    var percentage = (currentSlide / (totalSlides - slidesToShow)) * 100;
    $scrollbarThumb.css('left', percentage + '%');
  });

  $('#slider-scrollbar').on('click', function (e) {
    var offset = $(this).offset();
    var newLeft = e.pageX - offset.left;
    var percentage = newLeft / $(this).width();
    var newSlideIndex = Math.round(percentage * (totalSlides - slidesToShow));
    $slider.slick('slickGoTo', newSlideIndex);
  });
});
