// --- Global Helper Functions ---

let currentOmdbData = null; // To store OMDb data for later playback. Moved global for wider access.

function displayLatestMovies(moviesArray) {
    const $latestMoviesGrid = $('#latestMoviesGrid');
    $latestMoviesGrid.empty();

    if (!moviesArray || moviesArray.length === 0) {
        $latestMoviesGrid.html('<p class="text-center col-12">No movies to display.</p>');
        return;
    }
    const moviesToShow = moviesArray.slice(0, 6);
    moviesToShow.forEach(movie => {
        const posterSrc = (movie.Poster && movie.Poster !== "N/A") ? movie.Poster : 'https://via.placeholder.com/300x450.png?text=No+Poster';
        const movieCardHtml = `
            <div class="col-6 col-sm-4 col-md-3 col-lg-2 mb-4 d-flex align-items-stretch">
                <div class="card h-100 movie-card-latest" data-imdbid="${movie.imdbID}" data-title="${movie.Title}">
                    <img src="${posterSrc}" class="card-img-top" alt="${movie.Title} Poster" style="object-fit: cover; height: 220px;">
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title" style="font-size: 0.9rem; margin-bottom: 0.25rem;">${movie.Title}</h6>
                        <p class="card-text mb-0"><small class="text-muted">Year: ${movie.Year}</small></p>
                    </div>
                </div>
            </div>`;
        $latestMoviesGrid.append(movieCardHtml);
    });

    $('#latestMoviesGrid .movie-card-latest').on('click', function() {
        const imdbID = $(this).data('imdbid'); // Get IMDb ID from data attribute
        $('#searchInput').val(imdbID);        // Populate search input with IMDb ID
        $('#searchType').val('movie');        // Ensure search type is 'movie' for OMDb ID/Title search
        // OMDb API handles 'i' parameter for ID search and 't' for title,
        // 'movie' type with an IMDb ID will be treated as an ID search by fetchOmdbDetails.
        $('#searchType').trigger('change');   // Trigger change for any UI updates tied to search type
        $('#searchButton').click();           // Trigger the main search button

        // Optional: Scroll to search results area or top of page
        $('html, body').animate({
            scrollTop: $('.container.mt-5').offset().top // Scrolls to the main container
        }, 500);
    });
}

function fetchLatestMovies(apiKey, baseUrl) {
    const currentYear = new Date().getFullYear();
    const $latestMoviesGrid = $('#latestMoviesGrid');
    $latestMoviesGrid.html('<p class="text-center col-12">Loading latest movies...</p>');

    $.ajax({
        url: baseUrl,
        method: 'GET',
        dataType: 'json',
        data: { apikey: apiKey, s: 'movie', type: 'movie', y: currentYear },
        success: function(data) {
            if (data.Response === "True" && data.Search) {
                displayLatestMovies(data.Search);
            } else {
                let errorMessage = data.Error || "No latest movies found for the current year.";
                if (data.Error === "Movie not found!") {
                    errorMessage = `No movies found for ${currentYear} with the term "movie".`;
                }
                $latestMoviesGrid.html(`<p class="text-center text-warning col-12">${errorMessage}</p>`);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("OMDb AJAX Error (Latest Movies):", textStatus, errorThrown);
            $latestMoviesGrid.html('<p class="text-center text-danger col-12">Failed to fetch latest movies.</p>');
        }
    });
}

function displayError(message) {
    $('#errorAlert').text(message).removeClass('d-none');
}

function hideError() {
    $('#errorAlert').addClass('d-none');
}

function hideAllSections(keepError = false) {
    $('#omdbDetailsCard').addClass('d-none');
    $('#videoPlayerSection').addClass('d-none');
    $('#vidsrcFrame').attr('src', '');
    $('#playOmdbItemButton').addClass('d-none');
    currentOmdbData = null; // Reset global currentOmdbData
    if (!keepError) {
        hideError();
    }
}

function displayOmdbDetails(data) {
    $('#omdbTitle').text(data.Title || 'N/A');
    $('#omdbType').text(data.Type ? data.Type.charAt(0).toUpperCase() + data.Type.slice(1) : 'N/A');
    $('#omdbYear').text(data.Year || 'N/A');
    $('#omdbGenre').text(data.Genre || 'N/A');
    $('#omdbDirector').text(data.Director || 'N/A');
    $('#omdbWriter').text(data.Writer || 'N/A');
    $('#omdbActors').text(data.Actors || 'N/A');
    $('#omdbPlot').text(data.Plot || 'N/A');
    $('#omdbRating').text(data.imdbRating ? `${data.imdbRating}/10 (IMDb)` : 'N/A');
    if (data.Poster && data.Poster !== "N/A") {
        $('#omdbPoster').attr('src', data.Poster);
    } else {
        $('#omdbPoster').attr('src', 'https://via.placeholder.com/300x450.png?text=No+Poster');
    }
    $('#omdbDetailsCard').removeClass('d-none');
    if (data.imdbID) {
        $('#playOmdbItemButton').removeClass('d-none');
    } else {
        $('#playOmdbItemButton').addClass('d-none');
    }
}

function fetchOmdbDetails(query, type, apiKey, baseUrl) {
    let searchParams = { apikey: apiKey, plot: 'full' };
    if (query.toLowerCase().startsWith('tt') && /^\d+$/.test(query.substring(2))) {
        searchParams.i = query;
    } else {
        searchParams.t = query;
    }
    if (type === 'tv') {
        searchParams.type = 'series';
    } else {
        searchParams.type = 'movie';
    }

    $.ajax({
        url: baseUrl,
        method: 'GET',
        dataType: 'json',
        data: searchParams,
        success: function(data) {
            if (data.Response === "True") {
                currentOmdbData = data; // Set global currentOmdbData
                displayOmdbDetails(data);
            } else {
                displayError(data.Error || "Media not found in OMDb.");
                currentOmdbData = null;
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("OMDb AJAX Error:", textStatus, errorThrown);
            displayError("Failed to fetch OMDb data.");
            currentOmdbData = null;
        }
    });
}

function buildEmbedUrl(type, id, season, episode, vidsrcBaseUrl) {
    let url = vidsrcBaseUrl;
    let queryParams = [];

    if (id.toLowerCase().startsWith('tt')) {
        queryParams.push(`imdb=${id}`);
    } else if (/^\d+$/.test(id)) {
        queryParams.push(`tmdb=${id}`);
    } else {
        displayError("Invalid ID format. Must be IMDb (tt...) or TMDB (numeric).");
        return null;
    }

    if (type === 'movie') {
        url += 'embed/movie';
    } else if (type === 'tv' || type === 'episode') {
        url += 'embed/tv';
        if (type === 'episode' && season && episode) {
            queryParams.push(`season=${season}`);
            queryParams.push(`episode=${episode}`);
            if ($('#autonextCheck').is(':checked')) queryParams.push('autonext=1');
        }
    } else {
        return null;
    }

    const subUrl = $('#subUrlInput').val().trim();
    if (subUrl) queryParams.push(`sub_url=${encodeURIComponent(subUrl)}`);
    const dsLang = $('#dsLangInput').val().trim();
    if (dsLang) queryParams.push(`ds_lang=${dsLang}`);
    queryParams.push(`autoplay=${$('#autoplayCheck').is(':checked') ? 1 : 0}`);

    if (queryParams.length > 0) url += '?' + queryParams.join('&');
    return url;
}

function embedVideo(url, title = "Playing Media") {
    if (url) {
        $('#vidsrcFrame').attr('src', url);
        $('#videoTitle').text(title);
        $('#videoPlayerSection').removeClass('d-none');
        $('html, body').animate({ scrollTop: $("#videoPlayerSection").offset().top - 20 }, 500);
    } else {
        $('#videoPlayerSection').addClass('d-none');
    }
}


// --- Document Ready ---
$(document).ready(function() {
    const omdbApiKey = '67b85ad0';
    const omdbBaseUrl = 'http://www.omdbapi.com/';
    const vidsrcBaseUrl = 'https://vidsrc.xyz/';

    // Initial UI setup
    hideAllSections();
    $('#searchType').trigger('change');
    fetchLatestMovies(omdbApiKey, omdbBaseUrl);

    // --- Event Handlers ---
    $('#searchType').on('change', function() {
        const type = $(this).val();
        $('#seasonInput, #episodeInput, #autonextSwitchContainer').addClass('d-none');
        $('#subUrlInput, #dsLangInput, #autoplayCheck').removeClass('d-none');
        $('#searchInput').val('');
        $('#suggestionsDropdown').hide().empty();

        if (type === 'episode-embed') {
            $('#seasonInput, #episodeInput, #autonextSwitchContainer').removeClass('d-none');
            $('#searchInput').attr('placeholder', 'Enter IMDb/TMDB ID');
        } else if (type === 'movie-embed' || type === 'tv-embed') {
            $('#searchInput').attr('placeholder', 'Enter IMDb/TMDB ID');
        } else {
            $('#searchInput').attr('placeholder', 'Enter Title or IMDb ID');
            $('#subUrlInput, #dsLangInput').addClass('d-none');
        }
    });

    $('#searchButton').on('click', function() {
        const searchType = $('#searchType').val();
        const query = $('#searchInput').val().trim();
        const season = $('#seasonInput').val().trim();
        const episode = $('#episodeInput').val().trim();

        if (!query) {
            displayError("Please enter a search query.");
            return;
        }
        $('#latestMoviesSection').addClass('d-none'); // Hide latest movies section
        hideAllSections();

        if (searchType === 'movie' || searchType === 'tv') {
            fetchOmdbDetails(query, searchType, omdbApiKey, omdbBaseUrl);
        } else {
            let embedUrl = '';
            let videoTitle = `Playing content for ID: ${query}`;
            if (searchType === 'movie-embed') {
                embedUrl = buildEmbedUrl('movie', query, null, null, vidsrcBaseUrl);
                videoTitle = `Movie: ${query}`;
            } else if (searchType === 'tv-embed') {
                embedUrl = buildEmbedUrl('tv', query, null, null, vidsrcBaseUrl);
                videoTitle = `TV Show: ${query}`;
            } else if (searchType === 'episode-embed') {
                if (!season || !episode) {
                    displayError("Season and Episode are required for episodes.");
                    return;
                }
                embedUrl = buildEmbedUrl('episode', query, season, episode, vidsrcBaseUrl);
                videoTitle = `TV Show: ${query} - S${season}E${episode}`;
            }

            if (embedUrl) embedVideo(embedUrl, videoTitle);
            else displayError("Could not construct embed URL.");
        }
    });

    $('#playOmdbItemButton').on('click', function() {
        if (currentOmdbData && currentOmdbData.imdbID) {
            const type = currentOmdbData.Type === 'series' ? 'tv' : 'movie';
            let embedUrl;
            let videoTitle = currentOmdbData.Title;

            if (type === 'movie') {
                 embedUrl = buildEmbedUrl('movie', currentOmdbData.imdbID, null, null, vidsrcBaseUrl);
            } else {
                embedUrl = buildEmbedUrl('tv', currentOmdbData.imdbID, null, null, vidsrcBaseUrl);
                if (currentOmdbData.Season && currentOmdbData.Episode) { // For OMDb results that are episodes
                     embedUrl = buildEmbedUrl('episode', currentOmdbData.imdbID, currentOmdbData.Season, currentOmdbData.Episode, vidsrcBaseUrl);
                     videoTitle += ` - S${currentOmdbData.Season}E${currentOmdbData.Episode}`;
                }
            }

            if (embedUrl) {
                hideAllSections(true);
                embedVideo(embedUrl, videoTitle);
            } else {
                displayError("Could not construct embed URL for this item.");
            }
        }
    });

    $('#searchInput, #seasonInput, #episodeInput').on('keypress', function(e) {
        if (e.which === 13) {
            if ($('#suggestionsDropdown').is(':visible') && $('#suggestionsDropdown .list-group-item.active').length) {
                $('#suggestionsDropdown .list-group-item.active').click();
                return;
            }
            $('#searchButton').click();
        }
    });

    // --- Autocomplete Functionality ---
    let debounceTimer;
    $('#searchInput').on('keyup', function(e) {
        const query = $(this).val().trim();
        const suggestionsDropdown = $('#suggestionsDropdown');
        clearTimeout(debounceTimer);

        if (query.length < 3) {
            suggestionsDropdown.hide().empty();
            return;
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") return;

        debounceTimer = setTimeout(() => {
            const searchType = $('#searchType').val();
            let omdbSearchType = '';
            if (searchType === 'movie' || searchType === 'movie-embed') omdbSearchType = 'movie';
            else if (searchType === 'tv' || searchType === 'tv-embed' || searchType === 'episode-embed') omdbSearchType = 'series';
            else { suggestionsDropdown.hide().empty(); return; }

            $.ajax({
                url: omdbBaseUrl, // omdbBaseUrl is available from $(document).ready scope
                method: 'GET',
                dataType: 'json',
                data: { apikey: omdbApiKey, s: query, type: omdbSearchType }, // omdbApiKey from $(document).ready
                success: function(data) {
                    suggestionsDropdown.empty();
                    if (data.Response === "True" && data.Search) {
                        data.Search.slice(0, 5).forEach(item => {
                            const suggestionItem = $(`<a href="#" class="list-group-item list-group-item-action suggestion-item">${item.Title} (${item.Year})</a>`);
                            suggestionItem.on('click', function(ev) {
                                ev.preventDefault();
                                $('#searchInput').val(item.Title);
                                suggestionsDropdown.hide().empty();
                            });
                            suggestionsDropdown.append(suggestionItem);
                        });
                        if (data.Search.length > 0) suggestionsDropdown.show();
                        else suggestionsDropdown.hide();
                    } else suggestionsDropdown.hide();
                },
                error: function() {
                    console.error("Error fetching autocomplete suggestions.");
                    suggestionsDropdown.hide().empty();
                }
            });
        }, 300);
    });

    $('#searchInput').on('keydown', function(e) {
        const suggestionsDropdown = $('#suggestionsDropdown');
        if (!suggestionsDropdown.is(':visible') || suggestionsDropdown.children().length === 0) return;
        let currentActive = suggestionsDropdown.find('.list-group-item.active');
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (currentActive.length === 0) suggestionsDropdown.children().first().addClass('active');
            else {
                currentActive.removeClass('active');
                let next = currentActive.next();
                if (next.length === 0) next = suggestionsDropdown.children().first();
                next.addClass('active');
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (currentActive.length === 0) suggestionsDropdown.children().last().addClass('active');
            else {
                currentActive.removeClass('active');
                let prev = currentActive.prev();
                if (prev.length === 0) prev = suggestionsDropdown.children().last();
                prev.addClass('active');
            }
        } else if (e.key === "Enter") {
            if (currentActive.length > 0) { e.preventDefault(); currentActive.click(); }
        } else if (e.key === "Escape") suggestionsDropdown.hide().empty();
    });

    $(document).on('click', function(e) {
        if (!$(e.target).closest('.input-group').length) {
            $('#suggestionsDropdown').hide().empty();
        }
    });
});
