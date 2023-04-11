import { HttpClient } from "@angular/common/http"
import { Actions } from "@ngrx/effects"
import { createEffect, ofType } from "@ngrx/effects"
import { of } from "rxjs"
import { catchError, map, retry, switchMap, tap } from "rxjs/operators"
import { AuthResponseData, AuthSerevice } from "../auth.service"
import * as AuthActions from './auth.actions'
import { Injectable } from "@angular/core"
import { Router } from "@angular/router"
import { User } from "../user.module"
import { environment } from "src/environments/environment"

const handleAuth = (expiresIn: number, email: string, localId: string, token: string) => {
    const expirationDate = new Date(new Date().getTime() + expiresIn * 1000);
    const user = new User(email, localId, token, expirationDate);
    localStorage.setItem('userData', JSON.stringify(user));
    return new AuthActions.AuthenticateSuccess({
        email: email,
        userId: localId,
        token: token,
        expirationDate: expirationDate,
        redirect: true
    });
};

const handleError = (errorResponse: any) => {
    let message = 'An unknown error occurred!';
    if (!errorResponse.error || !errorResponse.error.error) {
        return of(new AuthActions.AuthenticateFail(message));
    }
    switch (errorResponse.error.error.message) {
        case 'EMAIL_EXISTS':
            message = 'This email exists already!';
            break;
        case 'EMAIL_NOT_FOUND':
            message = 'This email does not exist!';
            break;
        case 'INVALID_PASSWORD':
            message = 'This password is incorrect!'
            break;
    }
    return of(new AuthActions.AuthenticateFail(message));
}

@Injectable()
export class AuthEffectes {

    authSignup = createEffect((): any => {
        return this.actions$.pipe(ofType(AuthActions.SIGNUP_START),
            switchMap((signupAction: AuthActions.SignupStart) => {
                return this.http.post<AuthResponseData>('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + environment.firebaseAPIKey,
                    {
                        email: signupAction.payload.email,
                        password: signupAction.payload.password,
                        returnSecureToken: true
                    }
                ).pipe(
                    tap((resData) => {
                        this.authService.setLogoutTimer(+resData.expiresIn * 1000);
                    }),
                    map((resData) => {
                        return handleAuth(+resData.expiresIn, resData.email, resData.localId, resData.idToken);
                    }),
                    catchError(errorResponse => {
                        return handleError(errorResponse);
                    }))
            }))
    })

    authLogin = createEffect((): any => {
        return this.actions$.pipe(ofType(AuthActions.LOGIN_START),
            switchMap((authData: AuthActions.LoginStart) => {
                return this.http.post<AuthResponseData>('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + environment.firebaseAPIKey,
                    {
                        email: authData.payload.email,
                        password: authData.payload.password,
                        returnSecureToken: true
                    }
                ).pipe(
                    tap((resData) => {
                        this.authService.setLogoutTimer(+resData.expiresIn * 1000);
                    }),
                    map((resData) => {
                        return handleAuth(+resData.expiresIn, resData.email, resData.localId, resData.idToken);
                    }),
                    catchError(errorResponse => {
                        return handleError(errorResponse);
                    }))

            }))
    });

    authRedirect = createEffect((): any => {
        return this.actions$.pipe(ofType(AuthActions.AUTHENTICATE_SUCCESS),
            tap((authSuccessAction: AuthActions.AuthenticateSuccess) => {
                if (authSuccessAction.payload.redirect) {
                    this.router.navigate(['/']);
                }
            }))
    }, { dispatch: false })

    authLogout = createEffect((): any => {
        return this.actions$.pipe(ofType(AuthActions.LOGOUT),
            tap(() => {
                this.authService.clearLogoutTimer();
                localStorage.removeItem('userData');
                this.router.navigate(['/auth'])
            }))
    }, { dispatch: false });

    autoLogin = createEffect((): any => {
        return this.actions$.pipe(
            ofType(AuthActions.AUTO_LOGIN),
            map(() => {
                const userData: {
                    emsil: string,
                    id: string,
                    _token: string,
                    _tokenExpirationDate: string
                } = JSON.parse(localStorage.getItem('userData'));

                if (!userData) {
                    return { type: 'DUMMY' };
                }

                const loadedUser = new User(userData.emsil, userData.id,
                    userData._token, new Date(userData._tokenExpirationDate));

                if (loadedUser.token) {
                    const expirationDuration = new Date(userData._tokenExpirationDate).getTime() - new Date().getTime();
                    this.authService.setLogoutTimer(expirationDuration);
                    return new AuthActions.AuthenticateSuccess({
                        email: loadedUser.email,
                        userId: loadedUser.id,
                        token: loadedUser.token,
                        expirationDate: new Date(userData._tokenExpirationDate),
                        redirect: false
                    });
                }

                return { type: 'DUMMY' };

            }))
    });


    constructor(
        private actions$: Actions,
        private http: HttpClient,
        private router: Router,
        private authService: AuthSerevice
    ) { }
}