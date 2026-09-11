<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Console\Scheduling\Schedule;

use App\Http\Middleware\LogRequest;
use App\Jobs\PreprocessProjectData;
    
    

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__ . '/../routes/api.php',
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up'
       // health: '/status', 
    )
    ->withSchedule(function (Schedule $schedule) {
        $schedule->job(new PreprocessProjectData)->everyTwoMinutes()->withoutOverlapping();
    })
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'request.log' => LogRequest::class
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        
    })->create();
