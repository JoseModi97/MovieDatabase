$(document).ready(function() {
    const apiKey = '67b85ad0';
    const omdbBaseUrl = 'http://www.omdbapi.com/';

    // Initially hide elements
    $('#movieDetailsCard').addClass('d-none');
    $('#videoPlayerSection').addClass('d-none');
    $('#videoPlayerHeading').addClass('d-none');
    $('#errorAlert').addClass('d-none');
    $('#loadingSpinner').addClass('d-none');

    $('#searchButton').on('click', function() {
        const query = $('#movieTitleInput').val().trim();
        if (!query) {
            displayError("Please enter a movie title or IMDb ID.");
            return;
        }

        // Show spinner, clear previous results and errors
        $('#loadingSpinner').removeClass('d-none');
        hideError();
        $('#movieDetailsCard').addClass('d-none');
        $('#videoPlayerHeading').addClass('d-none');
        $('#videoPlayerSection').addClass('d-none');
        $('#vidsrcFrame').attr('src', ''); // Stop video

        let searchParams = {
            apikey: apiKey
        };

        // Basic check if it's an IMDb ID (starts with 'tt' and has numbers)
        if (query.toLowerCase().startsWith('tt') && /^\d+$/.test(query.substring(2))) {
            searchParams.i = query;
        } else {
            searchParams.t = query;
        }

        $.ajax({
            url: omdbBaseUrl,
            method: 'GET',
            dataType: 'json',
            data: searchParams,
            beforeSend: function() {
                $('#loadingSpinner').removeClass('d-none');
                $('#searchButton').prop('disabled', true); // Disable button during search
            },
            success: function(data) {
                if (data.Response === "True") {
                    displayMovieDetails(data);
                    if (data.imdbID) {
                        embedVideo(data.imdbID);
                    } else {
                        $('#videoPlayerHeading').addClass('d-none');
                        $('#videoPlayerSection').addClass('d-none');
                    }
                } else {
                    displayError(data.Error || "Movie not found.");
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error("AJAX Error:", textStatus, errorThrown);
                displayError("Failed to fetch movie data. Please check your connection or try again later.");
            },
            complete: function() {
                $('#loadingSpinner').addClass('d-none');
                $('#searchButton').prop('disabled', false); // Re-enable button
            }
        });
    });

    function displayMovieDetails(movie) {
        $('#movieTitle').text(movie.Title || 'N/A');
        $('#movieYear').text(movie.Year || 'N/A');
        $('#movieGenre').text(movie.Genre || 'N/A');
        $('#movieDirector').text(movie.Director || 'N/A');
        $('#movieActors').text(movie.Actors || 'N/A');
        $('#moviePlot').text(movie.Plot || 'N/A');
        $('#movieRating').text(movie.imdbRating ? `${movie.imdbRating}/10 (IMDb)` : 'N/A');

        if (movie.Poster && movie.Poster !== "N/A") {
            $('#moviePoster').attr('src', movie.Poster);
        } else {
            $('#moviePoster').attr('src', 'https://via.placeholder.com/300x450.png?text=No+Poster+Available'); // Placeholder
        }

        $('#movieDetailsCard').removeClass('d-none');
    }

    function embedVideo(imdbID) {
        if (imdbID) {
            // User feedback: Use path parameter format https://vidsrc.to/embed/movie/{imdbID}
            const videoUrl = `https://vidsrc.to/embed/movie/${imdbID}`;
            $('#vidsrcFrame').attr('src', videoUrl);
            $('#videoPlayerHeading').removeClass('d-none'); // Show heading
            $('#videoPlayerSection').removeClass('d-none');
        } else {
            $('#videoPlayerHeading').addClass('d-none'); // Hide heading
            $('#videoPlayerSection').addClass('d-none');
        }
    }

    function displayError(message) {
        $('#errorAlert').text(message).removeClass('d-none');
        $('#movieDetailsCard').addClass('d-none');
        $('#videoPlayerSection').addClass('d-none');
    }

    function hideError() {
        $('#errorAlert').addClass('d-none');
    }

    // Allow search on pressing Enter in the input field
    $('#movieTitleInput').on('keypress', function(e) {
        if (e.which === 13) { // Enter key pressed
            $('#searchButton').click();
        }
    });
});
